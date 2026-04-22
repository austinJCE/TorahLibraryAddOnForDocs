const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const MIGRATIONS_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../apps-script/migrations.gs'),
  'utf8'
);

function makeUserPropertiesMock(initial = {}) {
  const store = Object.assign({}, initial);
  return {
    _store: store,
    getProperty(name) {
      return Object.prototype.hasOwnProperty.call(store, name) ? store[name] : null;
    },
    setProperty(name, value) {
      store[name] = String(value);
      return this;
    },
  };
}

function loadMigrations(initialProps = {}) {
  const userProperties = makeUserPropertiesMock(initialProps);
  const context = {
    console,
    PropertiesService: {
      getUserProperties() { return userProperties; },
    },
  };
  vm.createContext(context);
  vm.runInContext(MIGRATIONS_SOURCE, context, { filename: 'migrations.gs' });
  return { context, userProperties };
}

test('fresh install on v2 does not rewrite anything', () => {
  // A new user installs the add-on; onInstall has already populated defaults,
  // and the schema version is already up to date. No migration work.
  const { context, userProperties } = loadMigrations({
    prefs_schema_version: '2',
    apply_sheimot_on_insertion: 'true',
  });
  const rewrote = context.runUserPreferenceMigrationsIfNeeded_();
  assert.equal(rewrote, false);
  assert.equal(userProperties.getProperty('apply_sheimot_on_insertion'), 'true');
});

test('upgrading user without apply_sheimot_on_insertion gets it set to "true"', () => {
  // This is the *regression* that motivates the migration. A user who had
  // the pre-rewrite behavior did not have this key in their UserProperties,
  // and the rewrite introduced it defaulting to false, silently turning off
  // divine-name substitution. The migration restores the previous behavior.
  const { context, userProperties } = loadMigrations({
    meforash_replace: 'true',
    god_replace: 'true',
  });
  const rewrote = context.runUserPreferenceMigrationsIfNeeded_();
  assert.equal(rewrote, true);
  assert.equal(userProperties.getProperty('apply_sheimot_on_insertion'), 'true');
  assert.equal(userProperties.getProperty('prefs_schema_version'), '2');
});

test('migration is idempotent — second call does nothing', () => {
  const { context, userProperties } = loadMigrations({});
  context.runUserPreferenceMigrationsIfNeeded_();
  userProperties.setProperty('apply_sheimot_on_insertion', 'false'); // user disables intentionally
  const rewrote = context.runUserPreferenceMigrationsIfNeeded_();
  assert.equal(rewrote, false);
  // The second call must not resurrect the key to "true": the user explicitly set it off.
  assert.equal(userProperties.getProperty('apply_sheimot_on_insertion'), 'false');
});

test('user who explicitly set apply_sheimot_on_insertion to "false" before migrating keeps their choice', () => {
  const { context, userProperties } = loadMigrations({
    apply_sheimot_on_insertion: 'false',
  });
  context.runUserPreferenceMigrationsIfNeeded_();
  assert.equal(userProperties.getProperty('apply_sheimot_on_insertion'), 'false');
  assert.equal(userProperties.getProperty('prefs_schema_version'), '2');
});
