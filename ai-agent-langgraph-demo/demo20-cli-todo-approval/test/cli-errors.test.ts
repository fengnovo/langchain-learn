import assert from 'node:assert/strict';
import test from 'node:test';

import { errorMessage, isRecoverableNetworkError } from '../src/cli/errors.js';

test('recognizes connection errors and nested network causes', () => {
  assert.equal(isRecoverableNetworkError(new Error('Connection error.')), true);
  assert.equal(
    isRecoverableNetworkError(new Error('request failed', { cause: { code: 'ECONNRESET' } })),
    true,
  );
});

test('recognizes temporary HTTP failures but not authentication errors', () => {
  assert.equal(isRecoverableNetworkError({ status: 429, message: 'rate limited' }), true);
  assert.equal(isRecoverableNetworkError({ status: 503, message: 'unavailable' }), true);
  assert.equal(isRecoverableNetworkError({ status: 401, message: 'invalid key' }), false);
});

test('does not classify programming errors as network failures', () => {
  assert.equal(isRecoverableNetworkError(new TypeError('Cannot read properties of null')), false);
  assert.equal(errorMessage(new Error('boom')), 'boom');
});
