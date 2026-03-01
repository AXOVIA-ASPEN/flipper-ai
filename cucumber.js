/**
 * Cucumber.js Configuration
 * Feature files and steps live under test/features/ (legacy BDD)
 * Acceptance tests live under test/acceptance/ (organized by epic)
 * Tags: make test-acceptance TAGS=@smoke  (optional)
 */

const FEATURES_DIR = 'test/features';
const ACCEPTANCE_DIR = 'test/acceptance';

module.exports = {
  default: {
    features: [`${FEATURES_DIR}/**/*.feature`],
    require: [
      `${FEATURES_DIR}/step_definitions/**/*.ts`,
      `${FEATURES_DIR}/support/**/*.ts`,
    ],
    requireModule: ['tsx/cjs'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
      'junit:reports/cucumber-report.xml',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
      colorsEnabled: true,
    },
    retry: parseInt(process.env.CUCUMBER_RETRY || '0'),
    parallel: parseInt(process.env.CUCUMBER_PARALLEL || '1'),
    publishQuiet: true,
  },

  // Pretty: Gherkin in real time, passing steps green, failing steps red (for make test-acceptance).
  // parallel: 0 = run in main process only (avoids ERR_IPC_CHANNEL_CLOSED with workers).
  pretty: {
    features: [`${FEATURES_DIR}/**/*.feature`],
    require: [
      `${FEATURES_DIR}/step_definitions/**/*.ts`,
      `${FEATURES_DIR}/support/**/*.ts`,
    ],
    requireModule: ['tsx/cjs'],
    format: [
      'pretty',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
      colorsEnabled: true,
    },
    retry: 0,
    parallel: 0,
    publishQuiet: true,
  },

  ci: {
    features: [`${FEATURES_DIR}/**/*.feature`],
    require: [
      `${FEATURES_DIR}/step_definitions/**/*.ts`,
      `${FEATURES_DIR}/support/**/*.ts`,
    ],
    requireModule: ['tsx/cjs'],
    format: ['json:reports/cucumber-report.json', 'junit:reports/cucumber-report.xml'],
    retry: 2,
    parallel: 2,
    publishQuiet: true,
  },

  dev: {
    features: [`${FEATURES_DIR}/**/*.feature`],
    require: [
      `${FEATURES_DIR}/step_definitions/**/*.ts`,
      `${FEATURES_DIR}/support/**/*.ts`,
    ],
    requireModule: ['tsx/cjs'],
    format: ['pretty', 'html:reports/cucumber-report.html'],
    formatOptions: {
      snippetInterface: 'async-await',
      colorsEnabled: true,
    },
    retry: 0,
    parallel: 0,
    publishQuiet: true,
  },

  // Acceptance tests organized by epic (test/acceptance/features/)
  acceptance: {
    paths: [`${ACCEPTANCE_DIR}/features/**/*.feature`],
    require: [
      `${ACCEPTANCE_DIR}/step_definitions/**/*.ts`,
      `${ACCEPTANCE_DIR}/support/**/*.ts`,
    ],
    requireModule: ['tsx/cjs'],
    format: [
      'pretty',
      'html:reports/acceptance-report.html',
      'json:reports/acceptance-report.json',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
      colorsEnabled: true,
    },
    retry: 0,
    parallel: 0,
    publishQuiet: true,
  },
};
