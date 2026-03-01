import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

describe('Build Script Safety', () => {
  let packageJson: { scripts: Record<string, string> };

  beforeAll(() => {
    const raw = readFileSync(join(__dirname, '../../package.json'), 'utf-8');
    packageJson = JSON.parse(raw);
  });

  it('should not contain --accept-data-loss in build script', () => {
    expect(packageJson.scripts.build).not.toContain('--accept-data-loss');
  });

  it('should not use prisma db push in build script', () => {
    expect(packageJson.scripts.build).not.toContain('db push');
  });

  it('should use prisma migrate deploy in build script', () => {
    expect(packageJson.scripts.build).toContain('prisma migrate deploy');
  });

  it('should include prisma generate before migrate deploy', () => {
    const buildScript = packageJson.scripts.build;
    const generateIndex = buildScript.indexOf('prisma generate');
    const migrateIndex = buildScript.indexOf('prisma migrate deploy');
    expect(generateIndex).toBeGreaterThanOrEqual(0);
    expect(migrateIndex).toBeGreaterThan(generateIndex);
  });

  it('should include next build after prisma commands', () => {
    const buildScript = packageJson.scripts.build;
    const migrateIndex = buildScript.indexOf('prisma migrate deploy');
    const nextBuildIndex = buildScript.indexOf('next build');
    expect(nextBuildIndex).toBeGreaterThan(migrateIndex);
  });
});

describe('CI Workflow Validation', () => {
  const workflowsDir = join(__dirname, '../../.github/workflows');

  function loadWorkflow(filename: string): Record<string, unknown> {
    const raw = readFileSync(join(workflowsDir, filename), 'utf-8');
    return yaml.load(raw) as Record<string, unknown>;
  }

  it('should parse all workflow YAML files without errors', () => {
    const files = readdirSync(workflowsDir).filter((f) => f.endsWith('.yml'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(() => loadWorkflow(file)).not.toThrow();
    }
  });

  describe('ci.yml', () => {
    let ci: Record<string, unknown>;

    beforeAll(() => {
      ci = loadWorkflow('ci.yml');
    });

    it('should have required trigger events', () => {
      const on = ci.on as Record<string, unknown>;
      expect(on).toBeDefined();
      expect(on.push).toBeDefined();
      expect(on.pull_request).toBeDefined();
    });

    it('should have a build-container job that pushes to Artifact Registry', () => {
      const jobs = ci.jobs as Record<string, unknown>;
      expect(jobs['build-container']).toBeDefined();
      expect(jobs['docker']).toBeUndefined();
    });

    it('should have a deploy-cloud-run job instead of deploy-vercel', () => {
      const jobs = ci.jobs as Record<string, unknown>;
      expect(jobs['deploy-cloud-run']).toBeDefined();
      expect(jobs['deploy-vercel']).toBeUndefined();
    });

    it('deploy-cloud-run should depend on test, integration-test, python-test, and build-container', () => {
      const jobs = ci.jobs as Record<string, Record<string, unknown>>;
      const deploy = jobs['deploy-cloud-run'];
      const needs = deploy.needs as string[];
      expect(needs).toContain('test');
      expect(needs).toContain('integration-test');
      expect(needs).toContain('python-test');
      expect(needs).toContain('build-container');
    });

    it('build-container should not have a main-branch-only condition', () => {
      const jobs = ci.jobs as Record<string, Record<string, unknown>>;
      const buildContainer = jobs['build-container'];
      expect(buildContainer.if).toBeUndefined();
    });

    it('build-container should use Artifact Registry tags', () => {
      const jobs = ci.jobs as Record<string, Record<string, unknown>>;
      const buildContainer = jobs['build-container'];
      const steps = buildContainer.steps as Array<Record<string, unknown>>;
      const buildStep = steps.find(
        (s) =>
          (s.uses as string)?.includes('docker/build-push-action') ||
          (s.name as string)?.toLowerCase().includes('build')
      );
      expect(buildStep).toBeDefined();
    });

    it('build-container should specify Dockerfile path in config/docker/', () => {
      const jobs = ci.jobs as Record<string, Record<string, unknown>>;
      const buildContainer = jobs['build-container'];
      const steps = buildContainer.steps as Array<Record<string, unknown>>;
      const buildStep = steps.find((s) =>
        (s.uses as string)?.includes('docker/build-push-action')
      );
      expect(buildStep).toBeDefined();
      const withBlock = buildStep!.with as Record<string, unknown>;
      expect(withBlock.file).toBe('config/docker/Dockerfile');
    });

    it('should preserve existing lint-and-typecheck, test, integration-test, build, and python-test jobs', () => {
      const jobs = ci.jobs as Record<string, unknown>;
      expect(jobs['lint-and-typecheck']).toBeDefined();
      expect(jobs['test']).toBeDefined();
      expect(jobs['integration-test']).toBeDefined();
      expect(jobs['build']).toBeDefined();
      expect(jobs['python-test']).toBeDefined();
    });

    it('should use google-github-actions/auth@v2 for GCP authentication', () => {
      const jobs = ci.jobs as Record<string, Record<string, unknown>>;
      const allSteps: Array<Record<string, unknown>> = [];
      for (const jobName of ['build-container', 'deploy-cloud-run']) {
        const job = jobs[jobName];
        if (job?.steps) {
          allSteps.push(...(job.steps as Array<Record<string, unknown>>));
        }
      }
      const authSteps = allSteps.filter((s) =>
        (s.uses as string)?.includes('google-github-actions/auth@v2')
      );
      expect(authSteps.length).toBeGreaterThanOrEqual(2);
    });

    it('should have post-deploy health check steps', () => {
      const jobs = ci.jobs as Record<string, Record<string, unknown>>;
      const deploy = jobs['deploy-cloud-run'];
      const steps = deploy.steps as Array<Record<string, unknown>>;
      const healthSteps = steps.filter(
        (s) =>
          (s.name as string)?.toLowerCase().includes('health') ||
          (s.name as string)?.toLowerCase().includes('liveness') ||
          (s.name as string)?.toLowerCase().includes('readiness')
      );
      expect(healthSteps.length).toBeGreaterThanOrEqual(2);
    });

    it('should have database migration step before deploy', () => {
      const jobs = ci.jobs as Record<string, Record<string, unknown>>;
      const deploy = jobs['deploy-cloud-run'];
      const steps = deploy.steps as Array<Record<string, unknown>>;
      const migrationIdx = steps.findIndex(
        (s) =>
          (s.name as string)?.toLowerCase().includes('migration') ||
          (s.run as string)?.includes('prisma migrate deploy')
      );
      const deployIdx = steps.findIndex(
        (s) =>
          (s.uses as string)?.includes('deploy-cloudrun') ||
          (s.name as string)?.toLowerCase().includes('deploy to cloud run')
      );
      expect(migrationIdx).toBeGreaterThanOrEqual(0);
      expect(deployIdx).toBeGreaterThan(migrationIdx);
    });

    it('should document required GitHub secrets in workflow comments', () => {
      const raw = readFileSync(join(workflowsDir, 'ci.yml'), 'utf-8');
      expect(raw).toContain('GCP_PROJECT_ID');
      expect(raw).toContain('GCP_SA_KEY');
      expect(raw).toContain('CLOUD_RUN_SERVICE_PROD');
      expect(raw).toContain('CLOUD_RUN_SERVICE_STAGING');
    });
  });

  describe('vercel-deploy.yml', () => {
    let vercel: Record<string, unknown>;

    beforeAll(() => {
      vercel = loadWorkflow('vercel-deploy.yml');
    });

    it('should be deprecated with workflow_dispatch trigger only', () => {
      const on = vercel.on as Record<string, unknown>;
      expect(on.workflow_dispatch).toBeDefined();
      expect(on.push).toBeUndefined();
      expect(on.pull_request).toBeUndefined();
    });

    it('should contain deprecation notice', () => {
      const raw = readFileSync(
        join(workflowsDir, 'vercel-deploy.yml'),
        'utf-8'
      );
      expect(raw.toLowerCase()).toContain('deprecated');
    });
  });

  describe('deploy-firebase.yml', () => {
    let firebase: Record<string, unknown>;

    beforeAll(() => {
      firebase = loadWorkflow('deploy-firebase.yml');
    });

    it('should use pnpm instead of npm', () => {
      const jobs = firebase.jobs as Record<string, Record<string, unknown>>;
      const deploy = jobs['deploy'];
      const steps = deploy.steps as Array<Record<string, unknown>>;
      const installStep = steps.find(
        (s) =>
          (s.name as string)?.toLowerCase().includes('install dep') ||
          (s.run as string)?.includes('pnpm install')
      );
      expect(installStep).toBeDefined();
      expect((installStep!.run as string)).toContain('pnpm');
      expect((installStep!.run as string)).not.toContain('npm ci');
    });

    it('should use Node.js 22.x', () => {
      const jobs = firebase.jobs as Record<string, Record<string, unknown>>;
      const deploy = jobs['deploy'];
      const steps = deploy.steps as Array<Record<string, unknown>>;
      const nodeStep = steps.find((s) =>
        (s.uses as string)?.includes('actions/setup-node')
      );
      expect(nodeStep).toBeDefined();
      const withBlock = nodeStep!.with as Record<string, string>;
      expect(withBlock['node-version']).toBe('22.x');
    });

    it('should include prisma generate step', () => {
      const jobs = firebase.jobs as Record<string, Record<string, unknown>>;
      const deploy = jobs['deploy'];
      const steps = deploy.steps as Array<Record<string, unknown>>;
      const prismaStep = steps.find((s) =>
        (s.run as string)?.includes('prisma generate')
      );
      expect(prismaStep).toBeDefined();
    });

    it('should use pnpm cache instead of npm', () => {
      const jobs = firebase.jobs as Record<string, Record<string, unknown>>;
      const deploy = jobs['deploy'];
      const steps = deploy.steps as Array<Record<string, unknown>>;
      const nodeStep = steps.find((s) =>
        (s.uses as string)?.includes('actions/setup-node')
      );
      expect(nodeStep).toBeDefined();
      const withBlock = nodeStep!.with as Record<string, string>;
      expect(withBlock.cache).toBe('pnpm');
    });
  });

  describe('health-check.yml', () => {
    it('should not reference Vercel in fallback message', () => {
      const raw = readFileSync(join(workflowsDir, 'health-check.yml'), 'utf-8');
      expect(raw).not.toContain('vercel.app');
    });
  });
});
