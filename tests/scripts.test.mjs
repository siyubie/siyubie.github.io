import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const sectionFetches = [
  'contents/home.md',
  'contents/research.md',
];

function createScriptContext({ homeHeight = 414, prerendered = false, viewportHeight = 900 } = {}) {
  const listeners = {};
  const elements = new Map();
  const fetchCalls = [];
  const scrollCalls = [];
  const rootStyleProperties = new Map();
  const pageTopLinkListeners = [];
  const classes = new Set(prerendered ? ['site-preparing'] : []);

  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        getBoundingClientRect: () => ({ height: id === 'home' ? homeHeight : 0 }),
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
    documentElement: {
      style: {
        setProperty: (name, value) => rootStyleProperties.set(name, value),
      },
    },
    getElementById: getElement,
    querySelector: (selector) => {
      if (selector === '.top-section') {
        return { getBoundingClientRect: () => ({ height: 0 }) };
      }
      return null;
    },
    querySelectorAll: (selector) => {
      if (selector === 'a[href="#page-top"]') {
        return [{
          addEventListener: (name, callback) => {
            pageTopLinkListeners.push({ name, callback });
          },
        }];
      }
      return [];
    },
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
      innerHeight: viewportHeight,
      location: {
        hash: '',
      },
      MathJax: true,
      requestAnimationFrame: (callback) => callback(),
      scrollTo: (...args) => scrollCalls.push(args),
    },
  };

  return { classes, context, fetchCalls, listeners, pageTopLinkListeners, rootStyleProperties, scrollCalls };
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

test('scripts.js resets restored scroll position on the homepage', async () => {
  const source = await readFile(new URL('../static/js/scripts.js', import.meta.url), 'utf8');
  const { context, listeners, scrollCalls } = createScriptContext({ prerendered: true });

  vm.createContext(context);
  vm.runInContext(source, context);

  listeners.DOMContentLoaded({});

  assert.deepEqual(scrollCalls, [[0, 0]]);
});

test('scripts.js scrolls to the real top when the page-top link is clicked', async () => {
  const source = await readFile(new URL('../static/js/scripts.js', import.meta.url), 'utf8');
  const { context, listeners, pageTopLinkListeners, scrollCalls } = createScriptContext({ prerendered: true });
  let prevented = false;

  vm.createContext(context);
  vm.runInContext(source, context);

  listeners.DOMContentLoaded({});

  assert.equal(pageTopLinkListeners.length, 1);
  assert.equal(pageTopLinkListeners[0].name, 'click');

  pageTopLinkListeners[0].callback({
    preventDefault: () => {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.deepEqual(scrollCalls, [[0, 0], [0, 0]]);
});

test('scripts.js fits the hero height to the natural About Me height', async () => {
  const source = await readFile(new URL('../static/js/scripts.js', import.meta.url), 'utf8');
  const { context, listeners, rootStyleProperties } = createScriptContext({
    homeHeight: 414,
    prerendered: true,
    viewportHeight: 900,
  });

  vm.createContext(context);
  vm.runInContext(source, context);

  listeners.DOMContentLoaded({});

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(rootStyleProperties.get('--hero-height'), '486px');
});
