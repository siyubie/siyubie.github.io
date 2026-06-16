import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const sectionFetches = [
  'contents/home.md',
  'contents/research.md',
  'contents/teaching.md',
  'contents/cv.md',
  'contents/events.md',
];

function createScriptContext({ prerendered = false } = {}) {
  const listeners = {};
  const elements = new Map();
  const fetchCalls = [];
  const classes = new Set(prerendered ? ['site-preparing'] : []);

  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        innerHTML: prerendered && id.endsWith('-md') ? '<p>Pre-rendered content</p>' : '',
      });
    }
    return elements.get(id);
  };

  const document = {
    body: {
      classList: {
        add: (name) => classes.add(name),
        contains: (name) => classes.has(name),
        remove: (name) => classes.delete(name),
      },
      dataset: prerendered ? { prerendered: 'true' } : {},
      querySelector: (selector) => (selector === '#mainNav' ? {} : null),
    },
    fonts: {
      ready: Promise.resolve(),
    },
    getElementById: getElement,
    querySelectorAll: () => [],
  };

  const context = {
    Image: class Image {
      set src(value) {
        this._src = value;
        queueMicrotask(() => this.onload && this.onload());
      }

      decode() {
        return Promise.resolve();
      }
    },
    bootstrap: {
      ScrollSpy: class ScrollSpy {},
    },
    clearTimeout: () => {},
    console: {
      log: () => {},
    },
    document,
    fetch: async (path) => {
      fetchCalls.push(path);
      return {
        ok: true,
        text: async () => (path.endsWith('.yml') ? 'page-top-title: Siyu Bie' : `# ${path}`),
      };
    },
    jsyaml: {
      load: () => ({ 'page-top-title': 'Siyu Bie' }),
    },
    marked: {
      parse: (markdown) => `<p>${markdown}</p>`,
      use: () => {},
    },
    MathJax: {
      startup: {
        promise: Promise.resolve(),
      },
      typesetPromise: async () => {},
    },
    Promise,
    queueMicrotask,
    setTimeout: (callback) => {
      callback();
      return 1;
    },
    window: {
      addEventListener: (name, callback) => {
        listeners[name] = callback;
      },
      getComputedStyle: () => ({ display: 'none' }),
      MathJax: true,
      requestAnimationFrame: (callback) => callback(),
    },
  };

  return { classes, context, fetchCalls, listeners };
}

test('scripts.js handles DOMContentLoaded without an undefined sectionPromises error', async () => {
  const source = await readFile(new URL('../static/js/scripts.js', import.meta.url), 'utf8');
  const { context, fetchCalls, listeners } = createScriptContext();

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(typeof listeners.DOMContentLoaded, 'function');

  assert.doesNotThrow(() => {
    listeners.DOMContentLoaded({});
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(fetchCalls, [
    'contents/config.yml',
    ...sectionFetches,
  ]);
});

test('scripts.js reveals a pre-rendered page without fetching markdown content', async () => {
  const source = await readFile(new URL('../static/js/scripts.js', import.meta.url), 'utf8');
  const { classes, context, fetchCalls, listeners } = createScriptContext({ prerendered: true });

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(typeof listeners.DOMContentLoaded, 'function');
  listeners.DOMContentLoaded({});

  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(fetchCalls, []);
  assert.equal(classes.has('site-ready'), true);
});
