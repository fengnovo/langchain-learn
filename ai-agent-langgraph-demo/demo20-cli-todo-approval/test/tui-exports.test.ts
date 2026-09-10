import assert from 'node:assert/strict';
import test from 'node:test';

import { askUserQuestion } from '../src/tui/index.js';

test('TUI exports the ask_user interrupt bridge used by the CLI layer', () => {
  assert.equal(typeof askUserQuestion, 'function');
});
