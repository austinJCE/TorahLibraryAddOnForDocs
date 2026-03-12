const test = require('node:test');
const assert = require('node:assert/strict');
const { getEnglishAttribution } = require('../attribution.js');

test('returns empty string when version title is missing', () => {
  assert.equal(getEnglishAttribution({}), '');
  assert.equal(getEnglishAttribution(null), '');
});

test('formats attribution with version and direct source', () => {
  const data = {
    versionTitle: 'JPS 1917',
    versionSource: 'https://example.com/jps-1917',
  };

  assert.equal(
    getEnglishAttribution(data),
    'Translation: JPS 1917 | Source: https://example.com/jps-1917'
  );
});

test('falls back to matching source from versions list', () => {
  const data = {
    versionTitle: 'Steinsaltz',
    versions: [
      { language: 'he', versionTitle: 'Hebrew Base', versionSource: 'https://example.com/he' },
      { language: 'en', versionTitle: 'Steinsaltz', versionSource: 'https://example.com/stein' },
    ],
  };

  assert.equal(
    getEnglishAttribution(data),
    'Translation: Steinsaltz | Source: https://example.com/stein'
  );
});

test('uses translation-only fallback when no source is available', () => {
  const data = {
    versionTitle: 'No Source Translation',
    versions: [{ language: 'en', versionTitle: 'No Source Translation' }],
  };

  assert.equal(getEnglishAttribution(data), 'Translation: No Source Translation');
});
