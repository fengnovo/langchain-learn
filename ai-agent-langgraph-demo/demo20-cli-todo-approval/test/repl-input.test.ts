import assert from 'node:assert/strict';
import test from 'node:test';

import { editReplBuffer, splitReplCursor, type ReplKey } from '../repl-input.js';

const noKey: ReplKey = {};

test('Backspace still removes newly inserted text after moving the cursor', () => {
  let buffer = { value: 'abc', cursor: 3 };

  buffer = editReplBuffer(buffer, '', { leftArrow: true });
  buffer = editReplBuffer(buffer, 'x', noKey);
  // Ink 5 maps the DEL byte produced by Backspace to key.delete.
  buffer = editReplBuffer(buffer, '', { delete: true });

  assert.deepEqual(buffer, { value: 'abc', cursor: 2 });
});

test('cursor movement and deletion operate on complete graphemes', () => {
  let buffer = { value: '你👍🏽好', cursor: '你👍🏽好'.length };

  buffer = editReplBuffer(buffer, '', { leftArrow: true });
  buffer = editReplBuffer(buffer, '', { leftArrow: true });
  assert.equal(splitReplCursor(buffer).cursorText, '👍🏽');

  buffer = editReplBuffer(buffer, '', { backspace: true });
  assert.deepEqual(buffer, { value: '👍🏽好', cursor: 0 });
});

test('Ctrl+D performs forward deletion', () => {
  const buffer = editReplBuffer({ value: 'abc', cursor: 1 }, 'd', { ctrl: true });

  assert.deepEqual(buffer, { value: 'ac', cursor: 1 });
});
