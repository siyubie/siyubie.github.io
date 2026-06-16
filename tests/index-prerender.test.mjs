import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sectionIds = ['home-md', 'research-md'];
const hiddenSections = ['teaching', 'cv', 'events'];

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

test('index.html contains pre-rendered section content', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  for (const id of sectionIds) {
    const match = html.match(new RegExp(`<div class="main-body" id="${id}">([\\s\\S]*?)<\\/div>`));

    assert.ok(match, `missing ${id} container`);
    assert.notEqual(match[1].trim(), '', `${id} should be pre-rendered`);
  }

  assert.match(html, /<body id="page-top" class="site-preparing" data-prerendered="true">/);
});

test('index.html contains visible footer copyright text', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(
    html,
    /<span id="copyright-text" class="footer-text">&copy; Siyu Bie 2025\. <\/span>/
  );
});

test('index.html comments out teaching cv and events sections from the visible page', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const visibleHtml = stripHtmlComments(html);

  for (const section of hiddenSections) {
    assert.doesNotMatch(visibleHtml, new RegExp(`href="#${section}"`));
    assert.doesNotMatch(visibleHtml, new RegExp(`id="${section}"`));
    assert.doesNotMatch(visibleHtml, new RegExp(`id="${section}-md"`));
  }
});
