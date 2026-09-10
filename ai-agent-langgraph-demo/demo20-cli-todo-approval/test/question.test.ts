import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildUserQuestionAnswer,
  toggleQuestionSelection,
} from '../src/tui/question.js';
import type { UserQuestionRequest } from '../src/tui/types.js';

const multiQuestion: UserQuestionRequest = {
  kind: 'ask_user',
  question: '请选择水果',
  options: [
    { label: '草莓' },
    { label: '芒果' },
    { label: '西瓜' },
  ],
  multiple: true,
  allowCustom: true,
};

test('multi-select toggles choices without losing the other selections', () => {
  let selected: number[] = [];
  selected = toggleQuestionSelection(selected, 2);
  selected = toggleQuestionSelection(selected, 0);
  selected = toggleQuestionSelection(selected, 2);

  assert.deepEqual(selected, [0]);
});

test('multi-select answer contains selected options and custom input', () => {
  const answer = buildUserQuestionAnswer(multiQuestion, [0, 2], '  榴莲  ');

  assert.deepEqual(answer, {
    selections: [
      { index: 0, label: '草莓' },
      { index: 2, label: '西瓜' },
    ],
    customText: '榴莲',
  });
});

test('an empty answer cannot be submitted', () => {
  assert.equal(buildUserQuestionAnswer(multiQuestion, [], '   '), null);
});

test('single-select can submit only custom input', () => {
  const question = { ...multiQuestion, multiple: false };

  assert.deepEqual(buildUserQuestionAnswer(question, [], '火龙果'), {
    selections: [],
    customText: '火龙果',
  });
});

test('custom input is ignored when the tool did not enable it', () => {
  const question = { ...multiQuestion, allowCustom: false };

  assert.equal(buildUserQuestionAnswer(question, [], '火龙果'), null);
});
