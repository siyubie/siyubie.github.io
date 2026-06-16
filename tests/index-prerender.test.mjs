import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sectionIds = ['home-md', 'research-md', 'teaching-md', 'cv-md', 'events-md'];

test('index.html contains pre-rendered section content', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  for (const id of sectionIds) {
    const match = html.match(new RegExp(`<div class="main-body" id="${id}">([\\s\\S]*?)<\\/div>`));

    assert.ok(match, `missing ${id} container`);
    assert.notEqual(match[1].trim(), '', `${id} should be pre-rendered`);
  }

  assert.match(html, /<body id="page-top" class="site-preparing" data-prerendered="true">/);
});
