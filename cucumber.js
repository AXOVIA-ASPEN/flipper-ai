/**
 * Cucumber.js Configuration
 * Author: ASPEN
 * Company: Axovia AI
 */

module.exports = {
  default: {
    // Where to find feature files
    features: ['features/**/*.feature'],
    
    // Where to find step definitions
    require: [
      'features/step_definitions/**/*.ts',
      'features/support/**/*.ts'
    ],
    
    // Enable TypeScript
    requireModule: ['ts-node/register/transpile-only'],
    
    // Output formats
    format: [
      'progress-bar',                            // Terminal progress
      'html:reports/cucumber-report.html',       // HTML report
      'json:reports/cucumber-report.json',       // JSON for CI
      'junit:reports/cucumber-report.xml',       // JUnit for CI
    ],
    
    // Format options
    formatOptions: {
      snippetInterface: 'async-await',
      colorsEnabled: true,
    },
    
    // Retry failed scenarios
    retry: parseInt(process.env.CUCUMBER_RETRY || '0'),
    
    // Parallel execution (set to number of workers)
    parallel: parseInt(process.env.CUCUMBER_PARALLEL || '1'),
    
    // Don't publish to Cucumber Cloud
    publishQuiet: true,
  },
  
  // Profile for CI environment
  ci: {
    features: ['features/**/*.feature'],
    require: [
      'features/step_definitions/**/*.ts',
      'features/support/**/*.ts'
    ],
    requireModule: ['ts-node/register/transpile-only'],
    format: [
      'json:reports/cucumber-report.json',
      'junit:reports/cucumber-report.xml',
    ],
    retry: 2,
    parallel: 2,
    publishQuiet: true,
  },
  
  // Profile for local development with screenshots
  dev: {
    features: ['features/**/*.feature'],
    require: [
      'features/step_definitions/**/*.ts',
      'features/support/**/*.ts'
    ],
    requireModule: ['ts-node/register/transpile-only'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
      colorsEnabled: true,
    },
    retry: 0,
    parallel: 1,
    publishQuiet: true,
  }
};
