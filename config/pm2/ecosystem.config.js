/**
 * PM2 Ecosystem Configuration
 * Production process management for Flipper AI
 *
 * Usage:
 *   pm2 start ecosystem.config.js           # Start with staging config
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save                                # Persist across reboots
 *   pm2 startup                             # Enable auto-start on boot
 */

module.exports = {
  apps: [
    {
      name: 'flipper-ai',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_staging: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'file:./dev.db',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Set these via environment or .env.local:
        // DATABASE_URL: postgresql://...
        // AUTH_SECRET: ...
        // ENCRYPTION_SECRET: ...
        // ANTHROPIC_API_KEY: ...
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/ubuntu/.pm2/logs/flipper-ai-error.log',
      out_file: '/home/ubuntu/.pm2/logs/flipper-ai-out.log',
      merge_logs: true,
    },
  ],
};
