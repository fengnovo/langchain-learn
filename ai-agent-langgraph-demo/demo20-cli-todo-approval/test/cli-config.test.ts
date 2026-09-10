import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { parseCliArgs } from '../src/cli/config.js';

test('parseCliArgs uses CODE_AGENT_CWD and joins positional task text', () => {
  assert.deepEqual(parseCliArgs(['检查', '并修复'], { CODE_AGENT_CWD: '/tmp/project' }), {
    cwd: '/tmp/project',
    oneShotTask: '检查 并修复',
  });
});

test('parseCliArgs lets --cwd override the environment', () => {
  const cwd = path.resolve('fixture-project');
  assert.deepEqual(
    parseCliArgs(['开始', '--cwd', 'fixture-project', '任务'], {
      CODE_AGENT_CWD: '/tmp/ignored',
    }),
    {
      cwd,
      oneShotTask: '开始 任务',
    },
  );
});
