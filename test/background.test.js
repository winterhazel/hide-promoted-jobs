const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const backgroundSource = fs.readFileSync(
  path.join(__dirname, '..', 'ext', 'js', 'background.js'),
  'utf8'
);

function createEvent() {
  const listeners = [];
  return {
    addListener(listener) {
      listeners.push(listener);
    },
    emit(...args) {
      listeners.forEach((listener) => listener(...args));
    },
    listeners,
  };
}

function startServiceWorker(storageState = {}) {
  const actionClicked = createEvent();
  const installed = createEvent();
  const startup = createEvent();
  const badge = {};

  const chrome = {
    action: {
      onClicked: actionClicked,
      setBadgeBackgroundColor({ color }) {
        badge.color = color;
      },
      setBadgeText({ text }) {
        badge.text = text;
      },
    },
    runtime: {
      onInstalled: installed,
      onStartup: startup,
    },
    storage: {
      local: {
        get(key, callback) {
          callback({ [key]: storageState[key] });
        },
        set(values, callback) {
          Object.assign(storageState, values);
          if (callback) callback();
        },
      },
    },
  };

  vm.runInNewContext(backgroundSource, { chrome });

  return {
    actionClicked,
    badge,
    installed,
    startup,
    storageState,
  };
}

test('initializes storage and registers one toolbar listener', () => {
  const worker = startServiceWorker();

  assert.equal(worker.storageState.enabled, true);
  assert.deepEqual(worker.badge, { text: 'ON', color: 'green' });
  assert.equal(worker.actionClicked.listeners.length, 1);
  assert.equal(worker.installed.listeners.length, 1);
  assert.equal(worker.startup.listeners.length, 1);
});

test('toolbar clicks persist and display the current enabled state', () => {
  const worker = startServiceWorker({ enabled: true });

  worker.actionClicked.emit();
  assert.equal(worker.storageState.enabled, false);
  assert.deepEqual(worker.badge, { text: 'OFF', color: 'red' });

  worker.actionClicked.emit();
  assert.equal(worker.storageState.enabled, true);
  assert.deepEqual(worker.badge, { text: 'ON', color: 'green' });
});

test('a service-worker restart reads the persisted state', () => {
  const storageState = { enabled: false };
  const restartedWorker = startServiceWorker(storageState);

  assert.equal(restartedWorker.storageState.enabled, false);
  assert.deepEqual(restartedWorker.badge, { text: 'OFF', color: 'red' });
});
