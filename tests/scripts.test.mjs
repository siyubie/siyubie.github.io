import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('scripts.js handles DOMContentLoaded without an undefined sectionPromises error', async () => {
  const source = await readFile(new URL('../static/js/scripts.js', import.meta.url), 'utf8');
  const listeners = {};
  const elements = new Map();
  const fetchCalls = [];

  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, { id, innerHTML: '' });
    }
    return elements.get(id);
  };

  const context = {
    bootstrap: {
      ScrollSpy: class ScrollSpy {},
    },
    console: {
      log: () => {},
    },
    document: {
      body: {
        querySelector: (selector) => (selector === '#mainNav' ? {} : null),
      },
      getElementById: getElement,
      querySelectorAll: () => [],
    },
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
    window: {
      addEventListener: (name, callback) => {
        listeners[name] = callback;
      },
      getComputedStyle: () => ({ display: 'none' }),
      MathJax: true,
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(typeof listeners.DOMContentLoaded, 'function');

  assert.doesNotThrow(() => {
    listeners.DOMContentLoaded({});
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(fetchCalls, [
    'contents/config.yml',
    'contents/home.md',
    'contents/research.md',
    'contents/teaching.md',
    'contents/cv.md',
    'contents/events.md',
  ]);
});
