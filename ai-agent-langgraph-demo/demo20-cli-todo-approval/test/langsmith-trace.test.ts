import assert from 'node:assert/strict';
import test from 'node:test';

import { traceable } from 'langsmith/traceable';

type TestTraceConfig = {
  tags?: string[];
  metadata?: Record<string, unknown>;
};

test('LangSmith runtime config does not replace the task input', async () => {
  let receivedInput: unknown;
  const tracedTask = traceable(
    async (userInput: string, _traceConfig?: TestTraceConfig) => {
      receivedInput = userInput;
      return userInput.split('\n')[0];
    },
    {
      name: 'demo20-trace-argument-regression',
      tracingEnabled: false,
      argsConfigPath: [1],
    },
  );

  const result = await tracedTask('第一行\n第二行', {
    tags: ['cli-turn'],
    metadata: { thread_id: 'test-thread' },
  });

  assert.equal(receivedInput, '第一行\n第二行');
  assert.equal(result, '第一行');
});
